import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Find the role if provided, otherwise default to 'customer'
    const roleName = createUserDto.role || 'customer';
    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const { role: _, ...userDataWithoutRole } = createUserDto;

    const user = this.userRepository.create({
      ...userDataWithoutRole,
      password: hashedPassword,
      role: role,
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['role'],
    });
  }

  async findOne(uuid: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { uuid },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${uuid} not found`);
    }
    return user;
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async update(uuid: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(uuid);

    // Handle password update
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Handle role update
    if (updateUserDto.role) {
      const role = await this.roleRepository.findOne({
        where: { name: updateUserDto.role },
      });

      if (!role) {
        throw new NotFoundException(`Role '${updateUserDto.role}' not found`);
      }

      const { role: _, ...userDataWithoutRole } = updateUserDto;
      Object.assign(user, userDataWithoutRole);
      user.role = role;
    } else {
      Object.assign(user, updateUserDto);
    }

    return this.userRepository.save(user);
  }

  async remove(uuid: string): Promise<void> {
    const user = await this.findOne(uuid);
    await this.userRepository.remove(user);
  }
  async validatePassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }
}
